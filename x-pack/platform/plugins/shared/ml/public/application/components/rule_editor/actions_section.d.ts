export function ActionsSection({ actions, onSkipResultChange, onSkipModelUpdateChange }: {
    actions: any;
    onSkipResultChange: any;
    onSkipModelUpdateChange: any;
}): React.JSX.Element;
export namespace ActionsSection {
    namespace propTypes {
        let actions: PropTypes.Validator<any[]>;
        let onSkipResultChange: PropTypes.Validator<(...args: any[]) => any>;
        let onSkipModelUpdateChange: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
