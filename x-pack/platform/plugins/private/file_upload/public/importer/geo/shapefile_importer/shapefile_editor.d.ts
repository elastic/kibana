import React from 'react';
interface Props {
    shapefileName: string;
    onDbfSelect: (file: File | null) => void;
    onPrjSelect: (file: File | null) => void;
    onShxSelect: (file: File | null) => void;
}
export declare function ShapefileEditor(props: Props): React.JSX.Element;
export {};
