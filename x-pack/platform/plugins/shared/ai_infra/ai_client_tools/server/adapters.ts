import { tool } from '@langchain/core/tools';
import type { OneChatToolWithClientCallback } from '../common/types';
import { convertParametersToSchema } from '../common/schema_adapters';
import { z } from '@kbn/zod';

interface AssistantToolParams {
  connectorId: string;
  llmTasks: any;
  request: any;
  contentReferencesStore: any;
}

export const mapToolToServerSideSecuritySolutionTool = <T extends {}, Dependencies extends {}>(toolDetails: OneChatToolWithClientCallback<Dependencies>): T => {
  const isSupported = (params: any) => {
    //@todo
    return true;
  };
  return {
    id: toolDetails.id,
    name: toolDetails.name,
    description: toolDetails.description,
    // parameters: toolDetails.parameters,
    sourceRegister: 'clientSideTool',
    isSupported,
    getTool(params: AssistantToolParams) {
      console.log('params', params);
      if (!isSupported(params)) return null;

      const { connectorId, llmTasks, request, contentReferencesStore } =
        params as AssistantToolParams;

      // This check is here in order to satisfy TypeScript
      if (llmTasks == null || connectorId == null) return null;

      return tool(
        async ( params: any) => {
          console.log('params', JSON.stringify(params, null, 2));
          return {
            content: params,
          };
        },
        {
          name: toolDetails.name,
          description: toolDetails.description,
          schema: convertParametersToSchema(toolDetails.parameters),
          //   esql: z.object({
          //     query: z
          //       .string()
          //       .meta({
          //         description: 'The ES|QL query for this visualization. Use the "query" function to generate ES|QL first and then add it here.'
          //       }),
          //   }),
          //   type: z.enum(['bar', 'line', 'area', 'pie', 'gauge', 'heatmap', 'mosaic', 'regionmap', 'table', 'tagcloud', 'treemap']).meta({
          //     description: 'The type of chart'
          //   }),
          //   layers: z
          //     .object({
          //       xy: z
          //         .object({
          //           xAxis: z.string(),
          //           yAxis: z.string(),
          //           type: z.enum(['line', 'bar', 'area']),
          //         })
          //         .optional(),
          //       donut: z
          //         .object({
          //           breakdown: z.string(),
          //         })
          //         .optional(),
          //       metric: z.object({}).optional(),
          //       gauge: z.object({}).optional(),
          //       pie: z
          //         .object({
          //           breakdown: z.string(),
          //         })
          //         .optional(),
          //       heatmap: z
          //         .object({
          //           xAxis: z.string(),
          //           breakdown: z.string(),
          //         })
          //         .optional(),
          //       mosaic: z
          //         .object({
          //           breakdown: z.string(),
          //         })
          //         .optional(),
          //       regionmap: z
          //         .object({
          //           breakdown: z.string(),
          //         })
          //         .optional(),
          //       table: z.object({}).optional(),
          //       tagcloud: z
          //         .object({
          //           breakdown: z.string(),
          //         })
          //         .optional(),
          //       treemap: z
          //         .object({
          //           breakdown: z.string(),
          //         })
          //         .optional(),
          //     })
          //     .optional(),
          //   title: z.string().meta({
          //     description: 'An optional title for the visualization.'
          //   }).optional(),
          // }),
          tags: toolDetails.tags || [],
        }
      );
    },
    };
};
