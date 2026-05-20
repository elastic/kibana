import React from 'react';
interface JobIdLink {
    id: string;
}
interface GroupIdLink {
    groupId: string;
    children: string;
}
type AnomalyDetectionJobIdLinkProps = JobIdLink | GroupIdLink;
export declare const AnomalyDetectionJobIdLink: (props: AnomalyDetectionJobIdLinkProps) => React.JSX.Element;
export {};
