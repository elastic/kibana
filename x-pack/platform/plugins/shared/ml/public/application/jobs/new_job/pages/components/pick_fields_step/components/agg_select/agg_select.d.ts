import type { FC } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { Field, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { DropDownLabel } from '@kbn/ml-field-stats-flyout';
export type { DropDownLabel };
export type DropDownProps = DropDownLabel[] | EuiComboBoxOptionOption[];
interface Props {
    fields: Field[];
    changeHandler(d: DropDownLabel[]): void;
    selectedOptions: DropDownLabel[];
    removeOptions: AggFieldPair[];
}
export declare const AggSelect: FC<Props>;
export declare function createLabel(pair: AggFieldPair): string;
