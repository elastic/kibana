export class ExplorerChartDistribution extends React.Component<any, any, any> {
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    static propTypes: {
        seriesConfig: PropTypes.Requireable<object>;
        severity: PropTypes.Requireable<any[]>;
        tableData: PropTypes.Requireable<object>;
        tooltipService: PropTypes.Validator<object>;
        cursor$: PropTypes.Requireable<object>;
        euiTheme: PropTypes.Validator<object>;
        isEmbeddable: PropTypes.Requireable<boolean>;
    };
    constructor(props: any);
    chartScales: {
        lineChartXScale: null;
        margin: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
    } | undefined;
    cursorStateSubscription: any;
    state: {
        popoverData: null;
        popoverCoords: number[];
        showRuleEditorFlyout: () => void;
        alertFlyoutVisible: boolean;
        alertFlyoutParams: undefined;
    };
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    renderChart(): void;
    shouldComponentUpdate(): boolean;
    setRef(componentNode: any): void;
    rootNode: any;
    closePopover(): void;
    setShowRuleEditorFlyoutFunction: (func: any) => void;
    unsetShowRuleEditorFlyoutFunction: () => void;
    handleShowAnomalyAlertFlyout: (anomaly: any) => void;
    render(): React.JSX.Element | null;
}
import React from 'react';
import PropTypes from 'prop-types';
