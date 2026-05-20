import type { CoreStart } from '@kbn/core/public';
import type * as H from 'history';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { CasesPublicStartDependencies } from '../../../../types';
import type { CasesContextProps } from '../../../cases_context';
export type CasesActionContextProps = Pick<CasesContextProps, 'externalReferenceAttachmentTypeRegistry' | 'persistableStateAttachmentTypeRegistry' | 'unifiedAttachmentTypeRegistry' | 'getFilesClient'>;
export interface Services {
    core: CoreStart;
    plugins: CasesPublicStartDependencies;
    history: H.History;
    storage: Storage;
}
