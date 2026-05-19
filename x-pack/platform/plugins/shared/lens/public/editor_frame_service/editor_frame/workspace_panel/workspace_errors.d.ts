import React from 'react';
import type { UserMessage } from '@kbn/lens-common';
interface Props {
    errors: Array<string | UserMessage>;
    title: string;
    onRender?: () => void;
}
export declare function WorkspaceErrors({ errors, title, onRender }: Props): React.JSX.Element;
export {};
