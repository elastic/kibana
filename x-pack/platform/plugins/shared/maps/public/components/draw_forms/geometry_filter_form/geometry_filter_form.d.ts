import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { GeoShapeRelation } from '@elastic/elasticsearch/lib/api/types';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
interface Props {
    buttonLabel: string;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
    intitialGeometryLabel: string;
    onSubmit: ({ actionId, geometryLabel, relation, }: {
        actionId: string;
        geometryLabel: string;
        relation: GeoShapeRelation;
    }) => void;
    errorMsg?: string;
    className?: string;
    isLoading?: boolean;
}
interface State {
    actionId: string;
    geometryLabel: string;
    relation: GeoShapeRelation;
}
export declare class GeometryFilterForm extends Component<Props, State> {
    state: State;
    _onGeometryLabelChange: (e: ChangeEvent<HTMLInputElement>) => void;
    _onRelationChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    _onActionIdChange: (value: string) => void;
    _onSubmit: () => void;
    _renderRelationInput(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
