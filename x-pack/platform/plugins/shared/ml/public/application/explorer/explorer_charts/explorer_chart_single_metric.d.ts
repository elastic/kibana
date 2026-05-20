export class ExplorerChartSingleMetric extends React.Component<any, any, any> {
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    static propTypes: {
        tooManyBuckets: PropTypes.Requireable<boolean>;
        seriesConfig: PropTypes.Requireable<object>;
        severity: PropTypes.Validator<any[]>;
        tableData: PropTypes.Requireable<object>;
        tooltipService: PropTypes.Validator<object>;
        timeBuckets: PropTypes.Validator<object>;
        onPointerUpdate: PropTypes.Validator<(...args: any[]) => any>;
        chartTheme: PropTypes.Validator<object>;
        cursor$: PropTypes.Requireable<object>;
        id: PropTypes.Validator<string>;
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
    state: {
        popoverData: null;
        popoverCoords: number[];
        showRuleEditorFlyout: () => void;
        alertFlyoutVisible: boolean;
        alertFlyoutParams: undefined;
    };
    componentDidMount(): void;
    cursorStateSubscription: any;
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
