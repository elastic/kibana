/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ExpressionAstExpression,
  ExpressionExecutionParams,
  ExpressionValue,
} from '@kbn/expressions-plugin/common';
import { fromExpression, getType } from '@kbn/interpreter';
import { pluck } from 'rxjs';
import { buildEmbeddableFilters } from '../../common/lib/build_embeddable_filters';
import { expressionsService } from './kibana_services';
import { getCanvasNotifyService } from './canvas_notify_service';
import { getCanvasFiltersService } from './canvas_filters_service';

interface Options {
  castToRender?: boolean;
}

class ExpressionsService {
  private notifyService;
  private filtersService;

  constructor() {
    this.notifyService = getCanvasNotifyService();
    this.filtersService = getCanvasFiltersService();
  }

  async interpretAst(
    ast: ExpressionAstExpression,
    variables: Record<string, any>,
    input: ExpressionValue = null
  ) {
    const context = await this.getGlobalContext();
    return await this.interpretAstWithContext(ast, input, {
      ...(context ?? {}),
      variables,
    });
  }

  async interpretAstWithContext(
    ast: ExpressionAstExpression,
    input: ExpressionValue = null,
    context?: ExpressionExecutionParams
  ): Promise<ExpressionValue> {
    return await expressionsService
      .execute(ast, input, { ...context, namespace: 'canvas' })
      .getData()
      .pipe(pluck('result'))
      .toPromise();
  }

  /**
   * Runs interpreter, usually in the browser
   *
   * @param {object} ast - Executable AST
   * @param {any} input - Initial input for AST execution
   * @param {object} variables - Variables to pass in to the intrepreter context
   * @param {object} options
   * @param {boolean} options.castToRender - try to cast to a type: render object?
   * @returns {Promise<ExpressionValue>}
   */
  async runInterpreter(
    ast: ExpressionAstExpression,
    input: ExpressionValue,
    variables: Record<string, any>,
    options: Options = {}
  ): Promise<ExpressionValue> {
    const context = await this.getGlobalContext();
    const fullContext = { ...(context ?? {}), variables };

    try {
      const renderable = await this.interpretAstWithContext(ast, input, fullContext);

      if (getType(renderable) === 'render') {
        return renderable;
      }

      if (options.castToRender) {
        return this.runInterpreter(fromExpression('render'), renderable, fullContext, {
          castToRender: false,
        });
      }

      throw new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
    } catch (err) {
      this.notifyService.error(err);
      throw err;
    }
  }

  getRenderer(name: string) {
    return expressionsService.getRenderer(name);
  }

  getFunctions() {
    return expressionsService.getFunctions();
  }

  private async getFilters() {
    const filtersList = this.filtersService.getFilters();
    const context = this.filtersService.getFiltersContext();
    const filterExpression = filtersList.join(' | ');
    const filterAST = fromExpression(filterExpression);
    return await this.interpretAstWithContext(filterAST, null, context);
  }

  private async getGlobalContext() {
    const canvasFilters = await this.getFilters();
    const kibanaFilters = buildEmbeddableFilters(canvasFilters ? canvasFilters.and : []);
    return {
      searchContext: { ...kibanaFilters },
    };
  }
}

let canvasExpressionsService: ExpressionsService;

export const getCanvasExpressionService = () => {
  if (!canvasExpressionsService) {
    canvasExpressionsService = new ExpressionsService();
  }
  return canvasExpressionsService;
};
