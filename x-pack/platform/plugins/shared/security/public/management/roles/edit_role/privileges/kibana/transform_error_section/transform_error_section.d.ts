import React, { PureComponent } from 'react';
import type { RoleTransformError } from '@kbn/security-plugin-types-common';
interface TransformErrorSectionProps {
    transformErrors: RoleTransformError[];
}
export declare class TransformErrorSection extends PureComponent<TransformErrorSectionProps, {}> {
    private getErrorMessage;
    render(): React.JSX.Element;
}
export {};
