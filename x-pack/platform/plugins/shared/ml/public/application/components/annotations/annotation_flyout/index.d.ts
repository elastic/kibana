import type { FC, ReactNode } from 'react';
import React, { Component } from 'react';
import type * as Rx from 'rxjs';
import type { CommonProps } from '@elastic/eui';
import type { AnnotationState, AnnotationUpdatesService } from '../../../services/annotations_service';
import type { MlKibanaReactContextValue } from '../../../contexts/kibana';
interface ViewableDetector {
    index: number;
    detector_description: string;
}
interface Entity {
    fieldName: string;
    fieldType: string;
    fieldValue: string;
}
interface Props {
    chartDetails: {
        entityData: {
            entities: Entity[];
        };
        functionLabel: string;
    };
    detectorIndex: number;
    detectors: ViewableDetector[];
    annotationUpdatesService: AnnotationUpdatesService;
}
interface State {
    annotationState: AnnotationState | null;
    isDeleteModalVisible: boolean;
    applyAnnotationToSeries: boolean;
}
export declare class AnnotationFlyoutUI extends Component<CommonProps & Props> {
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    context: MlKibanaReactContextValue;
    private deletionInProgress;
    state: State;
    annotationSub: Rx.Subscription | null;
    componentDidMount(): void;
    componentWillUnmount(): void;
    annotationTextChangeHandler: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    cancelEditingHandler: () => void;
    deleteConfirmHandler: () => void;
    deleteHandler: () => Promise<void>;
    closeDeleteModal: () => void;
    validateAnnotationText: () => string[];
    saveOrUpdateAnnotation: () => void;
    render(): ReactNode;
}
export declare const AnnotationFlyout: FC<any>;
export {};
