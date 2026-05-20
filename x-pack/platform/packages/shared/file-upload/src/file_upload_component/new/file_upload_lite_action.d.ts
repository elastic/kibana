import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { FileUploadStartDependencies } from '../kibana_context';
export declare function createOpenFileUploadLiteAction(coreStart: CoreStart, plugins: FileUploadStartDependencies): UiActionsActionDefinition<OpenFileUploadLiteContext>;
