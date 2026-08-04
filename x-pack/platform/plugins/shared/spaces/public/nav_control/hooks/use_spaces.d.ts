import type { UseQueryResult } from '@kbn/react-query';
import type { Space } from '../../../common';
import type { SpacesManager } from '../../spaces_manager';
export declare const SPACES_QUERY_KEY: string[];
export declare const useSpaces: (spacesManager: SpacesManager, enabled?: boolean) => UseQueryResult<Space[]>;
