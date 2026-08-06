/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ServiceRow } from './service_row';
import { SIGNAL_TYPE_LABELS } from './signal_type_badge';
import { useServicesStep } from './use_services_step';
import { ServiceSearchFilter } from '../service_search_filter';

interface ServicesStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function ServicesStep({ onContinue, onBack }: ServicesStepProps) {
  const {
    signalFilter,
    setSignalFilter,
    searchQuery,
    setSearchQuery,
    categories,
    activeCategory,
    setSelectedCategory,
    servicesInCategory,
    duplicateNamesInCategory,
    selectedSet,
    categoryStats,
    isReady,
    handleToggle,
    allInCategorySelected,
    handleSelectAllInCategory,
    handleDeselectAllInCategory,
    handleNext,
  } = useServicesStep({ onContinue });

  return (
    <div data-test-subj="onboardingStep-services">
      <EuiTitle size="m">
        <h2>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.title"
            defaultMessage="Which AWS services do you want to monitor?"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.subtitle"
            defaultMessage="Select the services you use. Elastic will set up everything needed to start collecting data from your AWS account."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <ServiceSearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        signalFilter={signalFilter}
        onSignalFilterChange={setSignalFilter}
        searchTestSubj="servicesStep-searchBox"
        filterTestSubj="servicesStep-signalFilter"
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false} style={{ maxWidth: 350 }}>
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            const stats = categoryStats.get(cat);
            const selected = stats?.selected ?? 0;
            const total = stats?.total ?? 0;
            const preview = stats?.preview ?? '';

            return (
              <EuiPanel
                key={cat}
                paddingSize="s"
                hasBorder={false}
                hasShadow={false}
                color={isActive ? 'subdued' : 'transparent'}
                onClick={() => setSelectedCategory(cat)}
                style={{ cursor: 'pointer' }}
                data-test-subj={`servicesStep-category-${cat}`}
              >
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{cat}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {preview}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color="default"
                      aria-label={i18n.translate(
                        'xpack.ingestHub.servicesStep.categoryBadgeAriaLabel',
                        {
                          defaultMessage: '{selected} of {total} services selected',
                          values: { selected, total },
                        }
                      )}
                    >
                      {selected > 0 ? `${selected}/${total}` : total}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            );
          })}
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="none" hasBorder>
            {activeCategory ? (
              <>
                <EuiPanel
                  color="subdued"
                  hasBorder={false}
                  hasShadow={false}
                  paddingSize="m"
                  borderRadius="none"
                >
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="spaceBetween"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h3>{activeCategory}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {allInCategorySelected ? (
                        <EuiButtonEmpty
                          size="s"
                          onClick={handleDeselectAllInCategory}
                          data-test-subj="servicesStep-deselectAllButton"
                        >
                          <FormattedMessage
                            id="xpack.ingestHub.servicesStep.deselectAll"
                            defaultMessage="Deselect all"
                          />
                        </EuiButtonEmpty>
                      ) : (
                        <EuiButtonEmpty
                          size="s"
                          onClick={handleSelectAllInCategory}
                          data-test-subj="servicesStep-selectAllButton"
                        >
                          <FormattedMessage
                            id="xpack.ingestHub.servicesStep.selectAll"
                            defaultMessage="Select all"
                          />
                        </EuiButtonEmpty>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
                <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
                  <EuiFlexGrid columns={2} gutterSize="m">
                    {servicesInCategory.map((service) => (
                      <EuiFlexItem key={service.id}>
                        <ServiceRow
                          service={service}
                          isSelected={selectedSet.has(service.id)}
                          onToggle={handleToggle}
                          displayName={
                            duplicateNamesInCategory.has(service.name)
                              ? `${service.name} ${SIGNAL_TYPE_LABELS[service.signalType]}`
                              : undefined
                          }
                        />
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGrid>
                </EuiPanel>
              </>
            ) : null}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {onBack && (
            <EuiButtonEmpty iconType="chevronSingleLeft" iconSide="left" onClick={onBack}>
              <FormattedMessage
                id="xpack.ingestHub.servicesStep.backButton"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleNext}
            isDisabled={!isReady}
            data-test-subj="servicesStep-continueButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.servicesStep.continueButton"
              defaultMessage="Continue"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
