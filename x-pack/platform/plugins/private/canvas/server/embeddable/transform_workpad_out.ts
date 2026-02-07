/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ast } from '@kbn/interpreter';
import { fromExpression, toExpression } from '@kbn/interpreter';
import type { SavedObjectReference } from '@kbn/core/server';
import type { TimeRange } from '@kbn/es-query';
import { EmbeddableTypes } from '../../canvas_plugin_src/expression_types';
import { DEFAULT_TIME_RANGE } from '../../common/lib';
import { encode, decode } from '../../common/lib/embeddable_dataurl';
import type { WorkpadAttributes } from '../routes/workpad/workpad_attributes';
import { embeddableService, logger } from '../kibana_services';

const embeddableFunctions = ['embeddable', 'savedLens', 'savedVisualization', 'savedMap'];

const extractTimeRangeFromAst = (ast?: Ast): TimeRange => {
  if (!ast?.chain?.length) return DEFAULT_TIME_RANGE;

  return ast.chain[0].function === 'timerange'
    ? {
        from: ast.chain[0].arguments.from[0] as string,
        to: ast.chain[0].arguments.to[0] as string,
      }
    : DEFAULT_TIME_RANGE;
};

export function transformWorkpadOut(
  workpad: WorkpadAttributes,
  references: SavedObjectReference[] = []
): WorkpadAttributes {
  try {
    const pages = workpad.pages.map((page) => {
      const elements = page.elements.map((element) => {
        if (!embeddableFunctions.some((fn) => element.expression.includes(fn))) {
          return element;
        }

        // remove element ID prefix from references for the current element
        const referencesForElement = references
          .filter(({ name }) => name.startsWith(`${element.id}:`))
          .map((reference) => ({
            ...reference,
            name: reference.name.slice(`${element.id}:`.length),
          }));

        const ast = fromExpression(element.expression);
        ast.chain = ast.chain.map((fn) => {
          if (!embeddableFunctions.includes(fn.function)) return fn;

          // migrate legacy embeddable expressions to generic embeddable expression
          switch (fn.function) {
            case 'savedLens':
              const lensConfig = {
                savedObjectId: fn.arguments.id[0] as string,
                timeRange: extractTimeRangeFromAst(fn.arguments.timerange?.[0] as Ast),
                title:
                  fn.arguments.title?.[0] == null ? undefined : (fn.arguments.title[0] as string),
              };
              fn.function = 'embeddable';
              fn.arguments = {
                config: [encode(lensConfig)],
                type: [EmbeddableTypes.lens],
              };
              break;
            case 'savedVisualization':
              const visualizationConfig = {
                savedObjectId: fn.arguments.id[0] as string,
                timeRange: extractTimeRangeFromAst(fn.arguments.timerange?.[0] as Ast),
                colors: fn.arguments.colors?.[0] ? (fn.arguments.colors[0] as string) : undefined,
                hideLegend: fn.arguments.hideLegend?.[0]
                  ? (fn.arguments.hideLegend[0] as boolean)
                  : undefined,
                title:
                  fn.arguments.title?.[0] == null ? undefined : (fn.arguments.title[0] as string),
              };
              // migrate legacy savedVisualization to embeddable expression
              fn.function = 'embeddable';
              fn.arguments = {
                config: [encode(visualizationConfig)],
                type: [EmbeddableTypes.visualization],
              };
              break;
            case 'savedMap':
              // migrate legacy savedMap to embeddable expression
              const mapConfig = {
                savedObjectId: fn.arguments.id[0] as string,
                timeRange: extractTimeRangeFromAst(fn.arguments.timerange?.[0] as Ast),
                title:
                  fn.arguments.title?.[0] == null ? undefined : (fn.arguments.title[0] as string),
              };
              fn.function = 'embeddable';
              fn.arguments = {
                config: [encode(mapConfig)],
                type: [EmbeddableTypes.map],
              };
              break;
          }

          const embeddableConfig = decode(fn.arguments.config[0] as string);
          const embeddableType = fn.arguments.type[0] as string;
          const transforms = embeddableService.getTransforms(embeddableType);

          // For legacy embeddable expressions if the embeddable config already has a savedObjectId,
          // transforms haven't been applied, so we need to transform in before we can transform out.
          // This should only execute once per legacy embeddable element because stored embeddables should
          // no longer have a savedObjectId.
          if (embeddableConfig.savedObjectId && referencesForElement.length > 0) {
            // Inject the savedObjectId from the legacy Canvas generated references for the element
            embeddableConfig.savedObjectId = referencesForElement[0].id;

            if (transforms?.transformIn && transforms.transformOut) {
              const { state: storedState, references: storedReferences } =
                transforms.transformIn(embeddableConfig);

              // transform out with the references extracted during transform in
              const transformedConfig = transforms.transformOut(storedState, storedReferences);
              fn.arguments.config[0] = encode(transformedConfig);
            }
            return fn;
          }

          if (transforms?.transformOut) {
            const transformedConfig = transforms.transformOut(
              embeddableConfig,
              referencesForElement
            );
            fn.arguments.config[0] = encode(transformedConfig);
          }
          return fn;
        });
        return { ...element, expression: toExpression(ast, { type: 'expression' }) };
      });
      return { ...page, elements };
    });
    return { ...workpad, pages };
  } catch (error) {
    logger.error(
      `Error transforming workpad out: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}
