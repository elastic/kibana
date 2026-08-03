import type { CoreStart } from '@kbn/core/public';
import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { FileUploadStartDependencies } from '../../kibana_context';
export declare function createFlyout(coreStart: CoreStart, plugins: FileUploadStartDependencies, props: OpenFileUploadLiteContext): void;
