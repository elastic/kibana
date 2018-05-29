import { ComponentClass } from 'react';

import { Adapters, InspectorViewDescription } from '../types';

interface InspectorPanelProps {
  adapters: Adapters;
  onClose: () => void;
  title?: string;
  views: InspectorViewDescription[];
}

export const InspectorPanel: ComponentClass<InspectorPanelProps>;
