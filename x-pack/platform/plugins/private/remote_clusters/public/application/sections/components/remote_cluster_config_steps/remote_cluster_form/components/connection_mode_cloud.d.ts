import type { FunctionComponent } from 'react';
import type { ClusterErrors } from '../validators';
import type { FormFields } from '../remote_cluster_form';
export interface Props {
    fields: FormFields;
    onFieldsChange: (fields: Partial<FormFields>) => void;
    fieldsErrors: ClusterErrors;
    areErrorsVisible: boolean;
}
export declare const ConnectionModeCloud: FunctionComponent<Props>;
