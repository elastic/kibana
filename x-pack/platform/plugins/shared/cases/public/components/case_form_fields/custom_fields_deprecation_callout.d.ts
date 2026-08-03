import React, { type ReactNode } from 'react';
interface CustomFieldsDeprecationCalloutProps {
    title?: ReactNode;
}
/**
 * Warning callout shown above legacy custom fields when templates v2 is enabled.
 * Users with settings permission get links to manage fields and disable the legacy
 * section; users without settings permission get an administrator-contact message.
 */
export declare const CustomFieldsDeprecationCallout: React.FC<CustomFieldsDeprecationCalloutProps>;
export {};
