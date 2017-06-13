import { IndicesGetIndicesProvider } from 'ui/indices/get_indices';
import { IndicesGetTemplateIndexPatternsProvider } from 'ui/indices/get_template_index_patterns';
import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana/indices');

export function IndicesProvider(Private) {
  this.getIndices = Private(IndicesGetIndicesProvider);
  this.getTemplateIndexPatterns = Private(IndicesGetTemplateIndexPatternsProvider);
}

module.service('indices', Private => Private(IndicesProvider));
