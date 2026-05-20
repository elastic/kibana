export class ColorMapSelect extends React.Component<any, any, any> {
    static getDerivedStateFromProps(nextProps: any, prevState: any): {
        prevPropsCustomColorMap: any;
        customColorMap: any;
    } | null;
    constructor(props: any);
    constructor(props: any, context: any);
    state: {};
    _renderColorMapToggle(): React.JSX.Element;
    _onColorPaletteSelect: (selectedPaletteId: any) => void;
    _onCustomColorMapChange: ({ colorStops, isInvalid }: {
        colorStops: any;
        isInvalid: any;
    }) => void;
    _renderColorStopsInput(): React.JSX.Element | null;
    _getColorPalettes(): (import("@elastic/eui/src/components/color_picker/color_palette_picker/color_palette_picker").EuiColorPalettePickerPaletteFixedProps & {
        getPalette: (steps: number) => string[];
    })[] | {
        palette: (string | import("@elastic/eui/src/components/color_picker/color_palette_picker/color_palette_picker").PaletteColorStop)[];
        value: string;
        title?: string;
        append?: React.ReactNode;
        type: "gradient";
        className?: string;
        'aria-label'?: string;
        'data-test-subj'?: string;
        css?: import("@emotion/serialize").Interpolation<import("@emotion/react").Theme>;
        getPalette: (steps: number) => string[];
    }[];
    _renderColorMapSelections(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
import React from 'react';
