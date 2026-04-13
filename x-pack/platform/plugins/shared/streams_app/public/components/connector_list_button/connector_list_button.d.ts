import type { EuiButtonProps } from '@elastic/eui';
import React from 'react';
import type { AIFeatures } from '../../hooks/use_ai_features';
export declare function ConnectorListButtonBase({ buttonProps, aiFeatures, }: {
    buttonProps: EuiButtonProps & {
        onClick?: () => void;
    };
    aiFeatures: Pick<AIFeatures, 'couldBeEnabled' | 'enabled' | 'genAiConnectors'> | null;
}): React.JSX.Element | null;
export declare function ConnectorListButton({ buttonProps, }: {
    buttonProps: EuiButtonProps & {
        onClick?: () => void;
    };
}): React.JSX.Element;
