export function DetectorCell({ detectorDescription, numberOfRules }: {
    detectorDescription: any;
    numberOfRules: any;
}): React.JSX.Element;
export namespace DetectorCell {
    namespace propTypes {
        let detectorDescription: PropTypes.Validator<string>;
        let numberOfRules: PropTypes.Requireable<number>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
