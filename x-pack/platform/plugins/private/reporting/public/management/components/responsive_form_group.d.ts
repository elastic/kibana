import React from 'react';
import { type EuiDescribedFormGroupProps } from '@elastic/eui';
/**
 * A collapsible version of EuiDescribedFormGroup. Use the `narrow` prop
 * to obtain a vertical layout suitable for smaller forms
 */
export declare const ResponsiveFormGroup: ({ narrow, ...rest }: EuiDescribedFormGroupProps & {
    narrow?: boolean;
}) => React.JSX.Element;
