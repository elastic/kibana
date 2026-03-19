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
import { transformType } from '@kbn/embeddable-plugin/server';
import { EmbeddableTypes } from '../../canvas_plugin_src/expression_types';
import { DEFAULT_TIME_RANGE } from '../../common/lib';
import { encode, decode } from '../../common/lib/embeddable_dataurl';
import type { WorkpadAttributes } from '../routes/workpad/workpad_attributes';
import { embeddableService, logger } from '../kibana_services';
import { getReferencesForElement } from './get_references_for_element';
import { ensureLibraryReference } from './ensure_library_reference';

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

const extractMapCenterFromAst = (
  ast?: Ast
): { lat: number; lon: number; zoom: number } | undefined => {
  if (!ast?.chain?.length) return;

  return ast.chain[0].function === 'mapCenter'
    ? {
        lat: ast.chain[0].arguments.lat[0] as number,
        lon: ast.chain[0].arguments.lon[0] as number,
        zoom: ast.chain[0].arguments.zoom[0] as number,
      }
    : undefined;
};

export function transformWorkpadOut(
  workpad: WorkpadAttributes,
  references: SavedObjectReference[] = []
): WorkpadAttributes {
  const pages = workpad.pages.map((page) => {
    const elements = page.elements.map((element) => {
      if (!embeddableFunctions.some((fn) => element.expression.includes(fn))) {
        return element;
      }

      // remove element ID prefix from references for the current element
      let referencesForElement = getReferencesForElement(references, element.id);

      // use expressions service to inject references for by-reference embeddables using Canvas defined references
      const ast = fromExpression(element.expression);

      ast.chain = ast.chain.map((fn) => {
        if (!embeddableFunctions.includes(fn.function)) return fn;

        // migrate legacy embeddable expressions to generic embeddable expression
        switch (fn.function) {
          case 'savedLens': {
            const lensConfig = {
              savedObjectId: fn.arguments.id[0] as string,
              timeRange: extractTimeRangeFromAst(fn.arguments.timerange?.[0] as Ast),
              title:
                fn.arguments.title?.[0] == null ? undefined : (fn.arguments.title[0] as string),
              // skipping the palette argument because it's too complex to parse without the interpreter
            };
            fn.function = 'embeddable';
            fn.arguments = {
              config: [encode(lensConfig)],
              type: [EmbeddableTypes.lens],
            };
            break;
          }
          case 'savedVisualization': {
            const visualizationConfig = {
              savedObjectId: fn.arguments.id[0] as string,
              vis:
                fn.arguments.hideLegend?.[0] === true
                  ? { legendOpen: !fn.arguments.hideLegend?.[0] }
                  : undefined,
              timeRange: extractTimeRangeFromAst(fn.arguments.timerange?.[0] as Ast),
              title:
                fn.arguments.title?.[0] == null ? undefined : (fn.arguments.title[0] as string),
              // skipping the colors argument because it's too complex to parse without evaluating the expression
            };
            // migrate legacy savedVisualization to embeddable expression
            fn.function = 'embeddable';
            fn.arguments = {
              config: [encode(visualizationConfig)],
              type: [EmbeddableTypes.visualization],
            };
            break;
          }
          case 'savedMap': {
            // migrate legacy savedMap to embeddable expression
            const mapConfig = {
              savedObjectId: fn.arguments.id[0] as string,
              timeRange: extractTimeRangeFromAst(fn.arguments.timerange?.[0] as Ast),
              title:
                fn.arguments.title?.[0] == null ? undefined : (fn.arguments.title[0] as string),
              hiddenLayers:
                fn.arguments.hideLayer?.length > 0 ? (fn.arguments.hideLayer as string[]) : [],
              mapCenter: extractMapCenterFromAst(fn.arguments.center?.[0] as Ast),
            };
            fn.function = 'embeddable';
            fn.arguments = {
              config: [encode(mapConfig)],
              type: [EmbeddableTypes.map],
            };
            break;
          }
        }

        const embeddableConfig = decode(fn.arguments.config[0] as string);
        const storedEmbeddableType = fn.arguments.type[0] as string;
        const embeddableType = transformType(storedEmbeddableType);
        fn.arguments.type[0] = embeddableType;
        // Temporary escape hatch for lens as code
        // TODO remove when lens as code transforms are ready for production
        const transforms = embeddableService.getTransforms(
          embeddableType === 'lens' ? 'lens-dashboard-app' : embeddableType
        );

        try {
          // BWC: Legacy Canvas embeddables have a savedObjectId and incorrect reference names,
          // so we need to transform the references to use the correct reference name 'savedObjectRef'
          if (embeddableConfig.savedObjectId) {
            referencesForElement = ensureLibraryReference(
              referencesForElement,
              storedEmbeddableType,
              embeddableConfig.savedObjectId
            );
          }

          if (transforms?.transformOut) {
            const transformedConfig = transforms.transformOut(
              embeddableConfig,
              referencesForElement
            );
            fn.arguments.config[0] = encode(transformedConfig);
          }
        } catch (error) {
          logger.warn(
            `Error transforming element [${element.id}] out: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        return fn;
      });
      return { ...element, expression: toExpression(ast, { type: 'expression' }) };
    });
    return { ...page, elements };
  });
  return { ...workpad, pages };
}
