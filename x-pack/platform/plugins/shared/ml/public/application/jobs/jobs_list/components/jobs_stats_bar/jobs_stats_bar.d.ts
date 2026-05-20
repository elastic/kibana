export function JobStatsBar({ jobsSummaryList, showNodeInfo }: {
    jobsSummaryList: any;
    showNodeInfo: any;
}): React.JSX.Element;
export namespace JobStatsBar {
    namespace propTypes {
        let jobsSummaryList: PropTypes.Validator<any[]>;
        let showNodeInfo: PropTypes.Validator<boolean>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
