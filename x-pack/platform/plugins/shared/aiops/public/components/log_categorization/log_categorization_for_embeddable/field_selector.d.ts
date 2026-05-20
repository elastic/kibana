import type { FC } from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
interface Props {
    fields: DataViewField[];
    selectedField: DataViewField | null;
    setSelectedField: (field: DataViewField) => void;
    WarningComponent?: FC;
}
export declare const SelectedField: FC<Props>;
export declare const FieldSelector: FC<Props>;
export {};
