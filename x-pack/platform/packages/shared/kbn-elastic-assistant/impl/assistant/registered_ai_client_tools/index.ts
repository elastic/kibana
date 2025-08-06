import { addToDashboardTool } from '@kbn/ai-client-tools-plugin/public';
import type { Tool } from '@langchain/core/dist/tools';
import { pick } from 'lodash';

const clientSideTools = [addToDashboardTool];

const getToolDetailsForSecurityAssistant = (tool: Tool) => {
  return pick(tool, ['id', 'name', 'description', 'parameters', 'screenDescription']);
};


export const clientSideToolsForSecurityAssistant = clientSideTools.map(getToolDetailsForSecurityAssistant);
