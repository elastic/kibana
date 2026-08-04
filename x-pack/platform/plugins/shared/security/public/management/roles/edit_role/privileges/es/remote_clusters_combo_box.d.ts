import type { EuiComboBoxProps } from '@elastic/eui';
import React from 'react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
interface Props extends Omit<EuiComboBoxProps<string | number | string[] | undefined>, 'options'> {
    remoteClusters: Cluster[];
    type: 'remote_cluster' | 'remote_indexes';
}
export declare const RemoteClusterComboBox: React.FunctionComponent<Props>;
export {};
