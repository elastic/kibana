import React from 'react';
export declare const OptionalFieldLabel: React.JSX.Element;
export declare const RequiredOnCloseFieldLabel: React.JSX.Element;
/**
 * The label append node for a template/case field, given its requirement state:
 * - required now → no append (the field is already marked required)
 * - required only on close → "Required on close" (accurate: fillable now, mandatory before closing)
 * - otherwise → "Optional"
 */
export declare const getFieldRequirementLabel: (isRequired?: boolean, isRequiredOnClose?: boolean) => React.ReactNode;
