export function ExplorerChartLabel({ detectorLabel, entityFields, infoTooltip, isEmbeddable, wrapLabel, onSelectEntity, showFilterIcons, }: {
    detectorLabel: any;
    entityFields: any;
    infoTooltip: any;
    isEmbeddable: any;
    wrapLabel?: boolean | undefined;
    onSelectEntity: any;
    showFilterIcons: any;
}): React.JSX.Element;
export namespace ExplorerChartLabel {
    namespace propTypes {
        let detectorLabel: PropTypes.Validator<object>;
        let isEmbeddable: PropTypes.Requireable<boolean>;
        let entityFields: PropTypes.Requireable<(PropTypes.InferProps<{
            fieldName: PropTypes.Validator<string>;
            fieldValue: PropTypes.Validator<string>;
        }> | null | undefined)[]>;
        let infoTooltip: PropTypes.Validator<object>;
        let wrapLabel: PropTypes.Requireable<boolean>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
