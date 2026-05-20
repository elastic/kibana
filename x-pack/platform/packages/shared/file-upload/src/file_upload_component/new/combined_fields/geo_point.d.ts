import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-common';
import type { AddCombinedField } from './combined_fields_form';
interface Props {
    addCombinedField: AddCombinedField;
    hasNameCollision: (name: string) => boolean;
    results?: FindFileStructureResponse;
}
interface State {
    latField: string;
    lonField: string;
    geoPointField: string;
    geoPointFieldError: string;
    latFields: EuiSelectOption[];
    lonFields: EuiSelectOption[];
    submitError: string;
}
export declare class GeoPointForm extends Component<Props, State> {
    constructor(props: Props);
    onLatFieldChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    onLonFieldChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    onGeoPointFieldChange: (e: ChangeEvent<HTMLInputElement>) => void;
    hasNameCollision: import("lodash").DebouncedFunc<(name: string) => void>;
    onSubmit: () => void;
    render(): React.JSX.Element;
}
export {};
