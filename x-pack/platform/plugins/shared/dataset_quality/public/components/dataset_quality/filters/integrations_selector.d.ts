import React from 'react';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import type { Integration } from '../../../../common/data_streams_stats/integration';
interface IntegrationsSelectorProps {
    isLoading: boolean;
    integrations: IntegrationItem[];
    onIntegrationsChange: (integrations: IntegrationItem[]) => void;
}
export interface IntegrationItem extends Integration {
    label: string;
    checked?: EuiSelectableOptionCheckedType;
}
export declare function IntegrationsSelector({ isLoading, integrations, onIntegrationsChange, }: IntegrationsSelectorProps): React.JSX.Element;
export {};
