import React from 'react';
import { RENDER_AS } from '../../../../../common/constants';
interface Props {
    renderAs: RENDER_AS;
    onChange: (newValue: RENDER_AS) => void;
    isColumnCompressed?: boolean;
}
export declare function RenderAsSelect(props: Props): React.JSX.Element | null;
export {};
