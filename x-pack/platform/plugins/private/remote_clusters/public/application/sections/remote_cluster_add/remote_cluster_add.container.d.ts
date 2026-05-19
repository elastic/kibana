import type { ClusterPayload } from '../../../../common/lib';
import type { RequestError } from '../../../types';
interface Props {
    addCluster: (cluster: ClusterPayload) => void;
    isAddingCluster: boolean;
    addClusterError?: RequestError;
    clearAddClusterErrors: () => void;
}
export declare const RemoteClusterAdd: React.FC<Props>;
export {};
