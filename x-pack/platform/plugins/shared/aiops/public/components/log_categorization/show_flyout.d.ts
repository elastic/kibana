import type { CoreStart } from '@kbn/core/public';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import type { EuiFlyoutProps } from '@elastic/eui';
import type { AiopsPluginStartDeps } from '../../types';
export declare function showCategorizeFlyout(field: DataViewField, dataView: DataView, coreStart: CoreStart, plugins: AiopsPluginStartDeps, originatingApp: string, additionalFilter?: CategorizationAdditionalFilter, focusTrapProps?: EuiFlyoutProps['focusTrapProps']): Promise<void>;
