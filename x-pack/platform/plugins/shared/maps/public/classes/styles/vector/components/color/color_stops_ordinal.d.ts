export function ColorStopsOrdinal({ colorStops, onChange, swatches, }: {
    colorStops?: {
        stop: number;
        color: string;
    }[] | undefined;
    onChange: any;
    swatches: any;
}): React.JSX.Element;
export namespace ColorStopsOrdinal {
    namespace propTypes {
        let colorStops: PropTypes.Requireable<(PropTypes.InferProps<{
            stopKey: PropTypes.Requireable<number>;
            color: PropTypes.Requireable<string>;
        }> | null | undefined)[]>;
        let onChange: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
