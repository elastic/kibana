import React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { EditSpace } from './edit_space';
import { type EditSpaceProviderRootProps } from './provider';
type EditSpacePageProps = ComponentProps<typeof EditSpace> & EditSpaceProviderRootProps;
export declare function EditSpacePage({ spaceId, getFeatures, history, onLoadSpace, selectedTabId, allowFeatureVisibility, allowSolutionVisibility, children, ...editSpaceServicesProps }: PropsWithChildren<EditSpacePageProps>): React.JSX.Element;
export {};
