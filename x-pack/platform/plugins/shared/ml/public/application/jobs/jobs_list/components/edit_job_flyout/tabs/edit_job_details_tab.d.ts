export class EditJobDetailsTabUI extends React.Component<any, any, any> {
    static getDerivedStateFromProps(props: any): {
        description: any;
        selectedGroups: any;
        mml: any;
        mmlEstimation: any;
        mmlHelpText: React.JSX.Element | null;
        mmlValidationError: any;
        groupsValidationError: any;
        modelSnapshotRetentionDays: any;
        dailyModelSnapshotRetentionAfterDays: any;
    };
    constructor(props: any);
    state: {
        description: string;
        groups: never[];
        selectedGroups: never[];
        mml: string;
        mmlEstimation: undefined;
        mmlValidationError: string;
        groupsValidationError: string;
        modelSnapshotRetentionDays: number;
        dailyModelSnapshotRetentionAfterDays: number;
    };
    setJobDetails: any;
    componentDidMount(): void;
    onDescriptionChange: (e: any) => void;
    onMmlChange: (e: any) => void;
    onApplyMmlEstimation: () => void;
    onModelSnapshotRetentionDaysChange: (e: any) => void;
    onDailyModelSnapshotRetentionAfterDaysChange: (e: any) => void;
    onGroupsChange: (selectedGroups: any) => void;
    onCreateGroup: (input: any, flattenedOptions: any) => void;
    render(): React.JSX.Element;
}
export namespace EditJobDetailsTabUI {
    namespace propTypes {
        let datafeedRunning: PropTypes.Validator<boolean>;
        let euiTheme: PropTypes.Validator<object>;
        let jobDescription: PropTypes.Validator<string>;
        let jobGroups: PropTypes.Validator<any[]>;
        let jobModelMemoryLimit: PropTypes.Validator<string>;
        let modelMemoryEstimation: PropTypes.Requireable<string>;
        let setJobDetails: PropTypes.Validator<(...args: any[]) => any>;
    }
}
export const EditJobDetailsTab: React.FC<Omit<any, "kibana">>;
import React from 'react';
import PropTypes from 'prop-types';
