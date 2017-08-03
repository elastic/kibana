import React from 'react';

import {
  KuiSideNav,
  KuiSideNavItem,
  KuiSideNavTitle,
} from '../../../../components';

export default () => (
  <KuiSideNav>
    <KuiSideNavTitle>Elasticsearch</KuiSideNavTitle>
    <KuiSideNavItem>Data sources</KuiSideNavItem>
    <KuiSideNavItem>Users</KuiSideNavItem>
    <KuiSideNavItem>Roles</KuiSideNavItem>
    <KuiSideNavItem isSelected>Watches</KuiSideNavItem>
    <KuiSideNavItem>Extremely long item is long</KuiSideNavItem>

    <KuiSideNavTitle>Kibana</KuiSideNavTitle>
    <KuiSideNavItem>Index Patterns</KuiSideNavItem>
    <KuiSideNavItem>Saved Objects</KuiSideNavItem>
    <KuiSideNavItem>Reporting</KuiSideNavItem>

    <KuiSideNavTitle>Logstash</KuiSideNavTitle>
    <KuiSideNavItem>Pipeline Viewer</KuiSideNavItem>
  </KuiSideNav>
);
