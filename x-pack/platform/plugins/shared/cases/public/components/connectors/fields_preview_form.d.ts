import React from 'react';
import type { ConnectorTypeFields } from '../../../common/types/domain';
import type { CaseActionConnector } from '../types';
interface Props {
    connector: CaseActionConnector | null;
    fields: ConnectorTypeFields['fields'];
}
export declare const ConnectorFieldsPreviewForm: React.NamedExoticComponent<Props>;
export {};
