import React from 'react';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
export type UncontrolledStreamsAppSearchBarProps = Omit<StatefulSearchBarProps, 'appName'>;
export declare function UncontrolledStreamsAppSearchBar(props: UncontrolledStreamsAppSearchBarProps): React.JSX.Element;
