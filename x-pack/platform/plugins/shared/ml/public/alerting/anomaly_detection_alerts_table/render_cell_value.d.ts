import React from 'react';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import type { GetAlertsTableProp } from '@kbn/response-ops-alerts-table/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
export declare const AlertsTableCellValue: GetAlertsTableProp<'renderCellValue'>;
export declare function getAlertFormatters(fieldFormats: FieldFormatsStart): (columnId: string, value: string | number | undefined) => React.JSX.Element;
export declare function getAlertEntryFormatter(fieldFormats: FieldFormatsRegistry): (columnId: string, value: any) => {
    title: string;
    description: any;
};
