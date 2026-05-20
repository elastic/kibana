import React from 'react';
import type { EuiStepProps } from '@elastic/eui';
export declare const ContentWrapper: import("styled-components").StyledComponent<(<TComponent extends React.ElementType = "div", TComponentRef = React.ReactElement<any, TComponent>>(props: import("@elastic/eui").EuiFlexGroupProps<TComponent> & {
    ref?: React.Ref<TComponentRef>;
}) => React.ReactElement) & {
    displayName?: string;
}, any, {}, never>;
export declare const getGenerateServiceTokenStep: ({ disabled, serviceToken, generateServiceToken, isLoadingServiceToken, }: {
    disabled?: boolean;
    serviceToken?: string;
    generateServiceToken: () => void;
    isLoadingServiceToken: boolean;
}) => EuiStepProps;
