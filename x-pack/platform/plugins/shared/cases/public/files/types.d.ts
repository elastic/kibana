import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import type { Owner } from '../../common/constants/types';
import type { CasesUiConfigType } from '../containers/types';
export type FilesConfig = CasesUiConfigType['files'];
export type CaseFileKinds = Map<Owner, FileKindBrowser>;
