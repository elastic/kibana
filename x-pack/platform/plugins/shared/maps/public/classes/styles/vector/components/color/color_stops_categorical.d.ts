export function ColorStopsCategorical({ colorStops, field, onChange, getValueSuggestions, swatches, }: {
    colorStops?: {
        stop: string;
        color: string;
    }[] | undefined;
    field: any;
    onChange: any;
    getValueSuggestions: any;
    swatches: any;
}): React.JSX.Element;
export namespace ColorStopsCategorical {
    namespace propTypes {
        let colorStops: PropTypes.Requireable<(PropTypes.InferProps<{
            stopKey: PropTypes.Requireable<number>;
            color: PropTypes.Requireable<string>;
        }> | null | undefined)[]>;
        let onChange: PropTypes.Validator<(...args: any[]) => any>;
        let getValueSuggestions: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
