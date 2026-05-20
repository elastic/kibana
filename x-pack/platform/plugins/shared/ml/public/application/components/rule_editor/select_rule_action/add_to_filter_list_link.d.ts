export function AddToFilterListLink({ fieldValue, filterId, addItemToFilterList }: {
    fieldValue: any;
    filterId: any;
    addItemToFilterList: any;
}): React.JSX.Element;
export namespace AddToFilterListLink {
    namespace propTypes {
        let fieldValue: PropTypes.Validator<string>;
        let filterId: PropTypes.Validator<string>;
        let addItemToFilterList: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
