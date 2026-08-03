import type { LayerWizard } from '../../layers';
import type { ESSearchSourceDescriptor, VectorLayerDescriptor } from '../../../../common/descriptor_types';
export declare function createDefaultLayerDescriptor(sourceConfig: Partial<ESSearchSourceDescriptor>, mapColors: string[]): VectorLayerDescriptor;
export declare const esDocumentsLayerWizardConfig: LayerWizard;
