import React, { Component } from 'react';
declare const DETAILS_TAB_ID = "details";
declare const STYLE_TAB_ID = "mapStyle";
interface Props {
    centerLon: number;
    centerLat: number;
    zoom: number;
    style: string;
}
interface State {
    selectedTabId: typeof DETAILS_TAB_ID | typeof STYLE_TAB_ID;
}
export declare class MapDetails extends Component<Props, State> {
    state: State;
    onSelectedTabChanged: (id: string) => void;
    renderTab: () => React.JSX.Element;
    renderTabs(): React.JSX.Element[];
    render(): React.JSX.Element;
}
export {};
