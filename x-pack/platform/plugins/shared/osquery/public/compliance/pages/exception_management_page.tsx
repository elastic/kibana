/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTable,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiBadge,
  EuiHealth,
  EuiText,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiFieldSearch,
  EuiSelect,
  EuiFilterGroup,
  EuiFilterButton,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiIcon,
  EuiToolTip,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonIcon,
  EuiTablePagination,
  EuiCallOut,
  EuiTreeView,
  EuiPanel,
  EuiAccordion,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useComplianceApi } from '../hooks/use_compliance_api';
import { ExceptionCreationModal } from '../components/exception_creation_modal';
import { ExceptionDetailsModal } from '../components/exception_details_modal';

interface ComplianceException {
  exception_id: string;
  name: string;
  description?: string;
  scope: {
    type: 'global' | 'benchmark' | 'rule' | 'host';
    target_id?: string;
    target_name?: string;
  };
  status: 'active' | 'expired' | 'revoked' | 'pending';
  enabled: boolean;
  priority: number;
  approval: {
    status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
    approver_name?: string;
    approved_at?: string;
  };
  audit: {
    created_by: string;
    created_at: string;
    updated_at?: string;
  };
  impact?: {
    affected_hosts?: number;
    affected_rules?: number;
    findings_suppressed?: number;
  };
  time_scope?: {
    type: 'permanent' | 'temporary' | 'scheduled';
    end_date?: string;
    expiration_date?: string;
  };
}

interface ExceptionScopeHierarchy {
  global: ComplianceException[];
  benchmarks: Record<string, {
    benchmark: ComplianceException[];
    rules: Record<string, ComplianceException[]>;
    hosts: Record<string, ComplianceException[]>;
  }>;
}

/**
 * Main page for managing compliance exceptions with hierarchical scoping display.
 * Provides creation, editing, approval, and impact analysis for exceptions.
 */
export const ExceptionManagementPage: React.FC = () => {
  const { 
    listExceptions, 
    createException, 
    updateException, 
    deleteException,
    approveException,
    getExceptionImpact 
  } = useComplianceApi();

  const [exceptions, setExceptions] = useState<ComplianceException[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExceptions, setSelectedExceptions] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedExceptionId, setSelectedExceptionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'hierarchy'>('table');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Load exceptions on component mount
  useEffect(() => {
    loadExceptions();
  }, [statusFilter, scopeFilter, searchQuery, sortField, sortDirection, pagination]);

  const loadExceptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listExceptions({
        page: pagination.pageIndex + 1,
        perPage: pagination.pageSize,
        sortField,
        sortOrder: sortDirection,
        filter: searchQuery,
        status: statusFilter !== 'all' ? [statusFilter as any] : undefined,
        scope_type: scopeFilter !== 'all' ? [scopeFilter as any] : undefined,
      });

      setExceptions(response.exceptions.map(so => so.attributes));
    } catch (error) {
      console.error('Failed to load exceptions:', error);
    } finally {
      setLoading(false);
    }
  }, [
    listExceptions, 
    pagination.pageIndex, 
    pagination.pageSize, 
    sortField, 
    sortDirection, 
    searchQuery, 
    statusFilter, 
    scopeFilter
  ]);

  // Filter and sort exceptions for display
  const filteredExceptions = useMemo(() => {
    let filtered = [...exceptions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(exception => 
        exception.name.toLowerCase().includes(query) ||
        exception.description?.toLowerCase().includes(query) ||
        exception.scope.target_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [exceptions, searchQuery]);

  // Organize exceptions into hierarchical structure
  const exceptionHierarchy = useMemo(() => {
    const hierarchy: ExceptionScopeHierarchy = {
      global: [],
      benchmarks: {},
    };

    filteredExceptions.forEach(exception => {
      switch (exception.scope.type) {
        case 'global':
          hierarchy.global.push(exception);
          break;
        
        case 'benchmark':
          const benchmarkId = exception.scope.target_id!;
          if (!hierarchy.benchmarks[benchmarkId]) {
            hierarchy.benchmarks[benchmarkId] = {
              benchmark: [],
              rules: {},
              hosts: {},
            };
          }
          hierarchy.benchmarks[benchmarkId].benchmark.push(exception);
          break;

        case 'rule':
          const ruleException = exception;
          // Extract benchmark ID from rule context (would come from API)
          const ruleBenchmarkId = 'default'; // Placeholder
          if (!hierarchy.benchmarks[ruleBenchmarkId]) {
            hierarchy.benchmarks[ruleBenchmarkId] = {
              benchmark: [],
              rules: {},
              hosts: {},
            };
          }
          const ruleId = ruleException.scope.target_id!;
          if (!hierarchy.benchmarks[ruleBenchmarkId].rules[ruleId]) {
            hierarchy.benchmarks[ruleBenchmarkId].rules[ruleId] = [];
          }
          hierarchy.benchmarks[ruleBenchmarkId].rules[ruleId].push(ruleException);
          break;

        case 'host':
          const hostException = exception;
          const hostBenchmarkId = 'default'; // Placeholder
          if (!hierarchy.benchmarks[hostBenchmarkId]) {
            hierarchy.benchmarks[hostBenchmarkId] = {
              benchmark: [],
              rules: {},
              hosts: {},
            };
          }
          const hostId = hostException.scope.target_id!;
          if (!hierarchy.benchmarks[hostBenchmarkId].hosts[hostId]) {
            hierarchy.benchmarks[hostBenchmarkId].hosts[hostId] = [];
          }
          hierarchy.benchmarks[hostBenchmarkId].hosts[hostId].push(hostException);
          break;
      }
    });

    return hierarchy;
  }, [filteredExceptions]);

  // Handle exception selection
  const handleSelectionChange = useCallback((exceptionId: string, isSelected: boolean) => {
    setSelectedExceptions(prev => 
      isSelected 
        ? [...prev, exceptionId]
        : prev.filter(id => id !== exceptionId)
    );
  }, []);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedExceptions.length === 0) return;

    setBulkActionLoading(true);
    try {
      switch (action) {
        case 'enable':
          await Promise.all(
            selectedExceptions.map(id => 
              updateException(id, { enabled: true }, 'bulk-action-user')
            )
          );
          break;
        case 'disable':
          await Promise.all(
            selectedExceptions.map(id => 
              updateException(id, { enabled: false }, 'bulk-action-user')
            )
          );
          break;
        case 'delete':
          await Promise.all(
            selectedExceptions.map(id => deleteException(id, 'bulk-action-user'))
          );
          break;
      }
      
      setSelectedExceptions([]);
      await loadExceptions();
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
    } finally {
      setBulkActionLoading(false);
      setIsActionsPopoverOpen(false);
    }
  }, [selectedExceptions, updateException, deleteException, loadExceptions]);

  // Render exception status badge
  const renderStatusBadge = (exception: ComplianceException) => {
    const { status, approval, enabled } = exception;
    
    if (!enabled) {
      return <EuiBadge color="default">Disabled</EuiBadge>;
    }

    switch (status) {
      case 'active':
        return approval.status === 'approved' 
          ? <EuiBadge color="success">Active</EuiBadge>
          : <EuiBadge color="warning">Pending Approval</EuiBadge>;
      case 'expired':
        return <EuiBadge color="default">Expired</EuiBadge>;
      case 'revoked':
        return <EuiBadge color="danger">Revoked</EuiBadge>;
      case 'pending':
        return <EuiBadge color="warning">Pending</EuiBadge>;
      default:
        return <EuiBadge color="default">{status}</EuiBadge>;
    }
  };

  // Render scope badge
  const renderScopeBadge = (scope: ComplianceException['scope']) => {
    const colors = {
      global: 'primary',
      benchmark: 'success',
      rule: 'warning',
      host: 'accent',
    };

    const icons = {
      global: 'globe',
      benchmark: 'package',
      rule: 'documentEdit',
      host: 'desktop',
    };

    return (
      <EuiBadge 
        color={colors[scope.type]} 
        iconType={icons[scope.type]}
      >
        {scope.type === 'global' ? 'Global' : scope.target_name || scope.target_id}
      </EuiBadge>
    );
  };

  // Render hierarchical tree view
  const renderHierarchyTree = () => {
    const treeItems = [];

    // Global exceptions
    if (exceptionHierarchy.global.length > 0) {
      treeItems.push({
        label: (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="globe" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s"><strong>Global Exceptions</strong></EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge>{exceptionHierarchy.global.length}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        id: 'global',
        children: exceptionHierarchy.global.map(exception => ({
          label: (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem>
                <EuiText size="s">{exception.name}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {renderStatusBadge(exception)}
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          id: exception.exception_id,
        })),
      });
    }

    // Benchmark exceptions
    Object.entries(exceptionHierarchy.benchmarks).forEach(([benchmarkId, benchmark]) => {
      const totalExceptions = benchmark.benchmark.length + 
        Object.values(benchmark.rules).flat().length +
        Object.values(benchmark.hosts).flat().length;

      if (totalExceptions === 0) return;

      const benchmarkChildren = [];

      // Benchmark-level exceptions
      if (benchmark.benchmark.length > 0) {
        benchmarkChildren.push({
          label: (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="package" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">Benchmark Level</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge>{benchmark.benchmark.length}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          id: `${benchmarkId}-benchmark`,
          children: benchmark.benchmark.map(exception => ({
            label: (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  <EuiText size="s">{exception.name}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {renderStatusBadge(exception)}
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            id: exception.exception_id,
          })),
        });
      }

      // Rule-level exceptions
      Object.entries(benchmark.rules).forEach(([ruleId, ruleExceptions]) => {
        if (ruleExceptions.length > 0) {
          benchmarkChildren.push({
            label: (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="documentEdit" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">Rule: {ruleId}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge>{ruleExceptions.length}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            id: `${benchmarkId}-rule-${ruleId}`,
            children: ruleExceptions.map(exception => ({
              label: (
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem>
                    <EuiText size="s">{exception.name}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {renderStatusBadge(exception)}
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
              id: exception.exception_id,
            })),
          });
        }
      });

      // Host-level exceptions
      Object.entries(benchmark.hosts).forEach(([hostId, hostExceptions]) => {
        if (hostExceptions.length > 0) {
          benchmarkChildren.push({
            label: (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="desktop" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">Host: {hostId}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge>{hostExceptions.length}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            id: `${benchmarkId}-host-${hostId}`,
            children: hostExceptions.map(exception => ({
              label: (
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem>
                    <EuiText size="s">{exception.name}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {renderStatusBadge(exception)}
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
              id: exception.exception_id,
            })),
          });
        }
      });

      treeItems.push({
        label: (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="package" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s"><strong>Benchmark: {benchmarkId}</strong></EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge>{totalExceptions}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        id: benchmarkId,
        children: benchmarkChildren,
      });
    });

    return (
      <EuiPanel paddingSize="m">
        <EuiTreeView
          items={treeItems}
          display="compressed"
          showExpansionArrows
          aria-label="Exception hierarchy tree"
        />
      </EuiPanel>
    );
  };

  // Render table view
  const renderTableView = () => {
    const columns = [
      {
        field: 'name',
        name: 'Name',
        sortable: true,
        render: (name: string, exception: ComplianceException) => (
          <EuiButtonEmpty
            size="s"
            onClick={() => {
              setSelectedExceptionId(exception.exception_id);
              setShowDetailsModal(true);
            }}
          >
            {name}
          </EuiButtonEmpty>
        ),
      },
      {
        field: 'scope',
        name: 'Scope',
        render: renderScopeBadge,
      },
      {
        field: 'status',
        name: 'Status',
        render: (_: any, exception: ComplianceException) => renderStatusBadge(exception),
      },
      {
        field: 'impact',
        name: 'Impact',
        render: (impact: ComplianceException['impact']) => (
          <EuiText size="s">
            {impact ? (
              <>
                {impact.affected_hosts && `${impact.affected_hosts} hosts`}
                {impact.affected_rules && ` • ${impact.affected_rules} rules`}
                {impact.findings_suppressed && ` • ${impact.findings_suppressed} findings`}
              </>
            ) : (
              'No data'
            )}
          </EuiText>
        ),
      },
      {
        field: 'audit.created_at',
        name: 'Created',
        render: (createdAt: string) => (
          <EuiText size="s">
            {new Date(createdAt).toLocaleDateString()}
          </EuiText>
        ),
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'Edit',
            icon: 'pencil',
            onClick: (exception: ComplianceException) => {
              setSelectedExceptionId(exception.exception_id);
              setShowCreateModal(true);
            },
          },
          {
            name: 'Delete',
            icon: 'trash',
            color: 'danger',
            onClick: async (exception: ComplianceException) => {
              try {
                await deleteException(exception.exception_id, 'user-action');
                await loadExceptions();
              } catch (error) {
                console.error('Failed to delete exception:', error);
              }
            },
          },
        ],
      },
    ];

    return (
      <EuiTable>
        <EuiTableHeader>
          {columns.map((column, index) => (
            <EuiTableHeaderCell 
              key={index}
              onSort={column.sortable ? (direction: any) => {
                setSortField(column.field);
                setSortDirection(direction);
              } : undefined}
            >
              {column.name}
            </EuiTableHeaderCell>
          ))}
        </EuiTableHeader>
        <EuiTableBody>
          {filteredExceptions.map(exception => (
            <EuiTableRow key={exception.exception_id}>
              {columns.map((column, colIndex) => (
                <EuiTableRowCell key={colIndex}>
                  {column.render 
                    ? column.render(
                        column.field ? (exception as any)[column.field] : undefined,
                        exception
                      )
                    : column.field && (exception as any)[column.field]
                  }
                </EuiTableRowCell>
              ))}
            </EuiTableRow>
          ))}
        </EuiTableBody>
      </EuiTable>
    );
  };

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.osquery.compliance.exceptionManagement.title"
                defaultMessage="Compliance Exceptions"
              />
            </h1>
          </EuiTitle>
        </EuiPageHeader>

        <EuiPageContent>
          <EuiPageContentBody>
            {/* Filters and Actions */}
            <EuiFlexGroup gutterSize="m" alignItems="center">
              <EuiFlexItem>
                <EuiFieldSearch
                  placeholder="Search exceptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  isClearable={true}
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <EuiFilterButton
                    iconType={statusFilter !== 'all' ? 'check' : 'empty'}
                    onClick={() => setStatusFilter(statusFilter === 'all' ? 'active' : 'all')}
                    isSelected={statusFilter !== 'all'}
                  >
                    Status: {statusFilter === 'all' ? 'All' : statusFilter}
                  </EuiFilterButton>

                  <EuiFilterButton
                    iconType={scopeFilter !== 'all' ? 'check' : 'empty'}
                    onClick={() => setScopeFilter(scopeFilter === 'all' ? 'global' : 'all')}
                    isSelected={scopeFilter !== 'all'}
                  >
                    Scope: {scopeFilter === 'all' ? 'All' : scopeFilter}
                  </EuiFilterButton>
                </EuiFilterGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiSelect
                  options={[
                    { value: 'table', text: 'Table View' },
                    { value: 'hierarchy', text: 'Hierarchy View' },
                  ]}
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="plus"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create Exception
                </EuiButton>
              </EuiFlexItem>

              {selectedExceptions.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButton
                        iconType="arrowDown"
                        iconSide="right"
                        isLoading={bulkActionLoading}
                        onClick={() => setIsActionsPopoverOpen(!isActionsPopoverOpen)}
                      >
                        Actions ({selectedExceptions.length})
                      </EuiButton>
                    }
                    isOpen={isActionsPopoverOpen}
                    closePopover={() => setIsActionsPopoverOpen(false)}
                    panelPaddingSize="none"
                  >
                    <EuiContextMenuPanel
                      items={[
                        <EuiContextMenuItem
                          key="enable"
                          icon="eye"
                          onClick={() => handleBulkAction('enable')}
                        >
                          Enable Selected
                        </EuiContextMenuItem>,
                        <EuiContextMenuItem
                          key="disable"
                          icon="eyeClosed"
                          onClick={() => handleBulkAction('disable')}
                        >
                          Disable Selected
                        </EuiContextMenuItem>,
                        <EuiContextMenuItem
                          key="delete"
                          icon="trash"
                          onClick={() => handleBulkAction('delete')}
                        >
                          Delete Selected
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            {/* Content */}
            {loading ? (
              <EuiEmptyPrompt
                icon={<EuiLoadingSpinner size="xl" />}
                title={<h3>Loading exceptions...</h3>}
              />
            ) : filteredExceptions.length === 0 ? (
              <EuiEmptyPrompt
                iconType="minusInCircle"
                title={
                  <h3>
                    <FormattedMessage
                      id="xpack.osquery.compliance.exceptionManagement.emptyTitle"
                      defaultMessage="No exceptions found"
                    />
                  </h3>
                }
                body={
                  <p>
                    <FormattedMessage
                      id="xpack.osquery.compliance.exceptionManagement.emptyBody"
                      defaultMessage="Create exceptions to suppress compliance findings for specific rules, hosts, or entire benchmarks."
                    />
                  </p>
                }
                actions={[
                  <EuiButton
                    fill
                    iconType="plus"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create Exception
                  </EuiButton>,
                ]}
              />
            ) : (
              <>
                {viewMode === 'hierarchy' ? renderHierarchyTree() : renderTableView()}

                <EuiSpacer size="m" />

                <EuiTablePagination
                  pageCount={Math.ceil(exceptions.length / pagination.pageSize)}
                  activePage={pagination.pageIndex}
                  onChangePage={(pageIndex) => setPagination(prev => ({ ...prev, pageIndex }))}
                  itemsPerPage={pagination.pageSize}
                  onChangeItemsPerPage={(pageSize) => setPagination(prev => ({ ...prev, pageSize, pageIndex: 0 }))}
                />
              </>
            )}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>

      {/* Modals */}
      {showCreateModal && (
        <ExceptionCreationModal
          onClose={() => setShowCreateModal(false)}
          onSave={async (exception) => {
            try {
              await createException(exception);
              await loadExceptions();
              setShowCreateModal(false);
            } catch (error) {
              console.error('Failed to create exception:', error);
            }
          }}
          editingExceptionId={selectedExceptionId}
        />
      )}

      {showDetailsModal && (
        <ExceptionDetailsModal
          exceptionId={selectedExceptionId}
          onClose={() => setShowDetailsModal(false)}
          onUpdate={loadExceptions}
        />
      )}
    </EuiPage>
  );
};