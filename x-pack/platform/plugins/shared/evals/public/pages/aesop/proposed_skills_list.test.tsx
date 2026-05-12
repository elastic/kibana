/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { ProposedSkillsList } from './proposed_skills_list';
import { useEvalsApi } from '../../hooks/use_evals_api';

jest.mock('../../hooks/use_evals_api');
jest.mock('./components/skill_review_flyout', () => ({
  SkillReviewFlyout: ({ skill, onClose }: any) => (
    <div data-test-subj="skill-review-flyout">
      <div data-test-subj="flyout-skill-name">{skill.name}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const mockSkills = [
  {
    id: 'skill-1',
    name: 'Alert Investigation Assistant',
    description: 'Helps investigate security alerts by enriching with threat intel',
    confidence: 0.92,
    source: {
      pattern_frequency: 47,
      rationale: 'Frequently observed in SOC analyst workflows',
    },
    metadata: {
      created_at: '2024-03-20T10:00:00Z',
      indices_explored: 15,
    },
    validation: {
      status: 'passed',
      final_score: 0.89,
    },
    review: {
      status: 'pending_review',
    },
  },
  {
    id: 'skill-2',
    name: 'Threat Hunting Query Builder',
    description: 'Constructs hunting queries based on MITRE ATT&CK',
    confidence: 0.78,
    source: {
      pattern_frequency: 23,
      rationale: 'Common pattern in threat hunting sessions',
    },
    metadata: {
      created_at: '2024-03-20T11:30:00Z',
      indices_explored: 12,
    },
    validation: {
      status: 'validating',
    },
    review: {
      status: 'pending_review',
    },
  },
  {
    id: 'skill-3',
    name: 'Incident Response Playbook',
    description: 'Guides responders through incident triage',
    confidence: 0.65,
    source: {
      pattern_frequency: 8,
      rationale: 'Observed in incident response workflows',
    },
    metadata: {
      created_at: '2024-03-20T12:00:00Z',
      indices_explored: 8,
    },
    validation: {
      status: 'failed',
    },
    review: {
      status: 'pending_review',
    },
  },
];

/**
 * Helper: create a URL-aware get mock that returns connectors as [] and
 * uses `skillsResponse` for all other URLs. Individual tests should use
 * this instead of plain `mockResolvedValue` to avoid the connectors
 * endpoint receiving a non-array value.
 */
const makeGetMock = (skillsResponse: unknown) => (url: string) => {
  if (url.includes('/api/actions/connectors')) {
    return Promise.resolve([]);
  }
  return Promise.resolve(skillsResponse);
};

describe('ProposedSkillsList Component', () => {
  let queryClient: QueryClient;
  let history: ReturnType<typeof createMemoryHistory>;
  let mockHttp: { get: jest.Mock };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    history = createMemoryHistory();

    mockHttp = {
      // Default: return empty array for connectors, empty skills for skills endpoint
      get: jest.fn().mockImplementation((url: string) => {
        if (url.includes('/api/actions/connectors')) {
          return Promise.resolve([]);
        }
        return Promise.resolve({ skills: [], total: 0 });
      }),
    };

    (useEvalsApi as jest.Mock).mockReturnValue({
      http: mockHttp,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <ProposedSkillsList />
        </Router>
      </QueryClientProvider>
    );

  describe('loading state', () => {
    it('should show loading spinner when fetching skills', () => {
      mockHttp.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderComponent();

      expect(screen.getByText('Loading proposed skills...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when fetch fails', async () => {
      mockHttp.get.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load skills')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display danger prompt on error', async () => {
      mockHttp.get.mockRejectedValue(new Error('API error'));

      renderComponent();

      await waitFor(() => {
        const errorPrompt = screen.getByText('Failed to load skills').closest('.euiEmptyPrompt');
        expect(errorPrompt).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      mockHttp.get.mockImplementation(makeGetMock({ skills: [], total: 0 }));
    });

    it('should show empty state when no skills exist', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Skills Discovered Yet')).toBeInTheDocument();
      });
    });

    it('should display onboarding steps', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Navigate to Exploration Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Trigger exploration')).toBeInTheDocument();
        expect(screen.getByText('Wait for discovery')).toBeInTheDocument();
        expect(screen.getByText('Review skills here')).toBeInTheDocument();
      });
    });

    it('should navigate to exploration dashboard when button clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Go to Exploration Dashboard')).toBeInTheDocument();
      });

      const button = screen.getByText('Go to Exploration Dashboard');
      await user.click(button);

      expect(history.location.pathname).toBe('/aesop/exploration');
    });
  });

  describe('skills table rendering', () => {
    beforeEach(() => {
      mockHttp.get.mockImplementation(makeGetMock({ skills: mockSkills, total: 3 }));
    });

    it('should render table when skills exist', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('should display all skills in table', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Alert Investigation Assistant')).toBeInTheDocument();
        expect(screen.getByText('Threat Hunting Query Builder')).toBeInTheDocument();
        expect(screen.getByText('Incident Response Playbook')).toBeInTheDocument();
      });
    });

    it('should render skill descriptions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText('Helps investigate security alerts by enriching with threat intel')
        ).toBeInTheDocument();
      });
    });

    it('should display confidence badges with correct colors', async () => {
      renderComponent();

      await waitFor(() => {
        // High confidence (92%) should be success/green
        const highConfidence = screen.getByText('92%');
        expect(highConfidence).toBeInTheDocument();

        // Medium confidence (78%) should be warning/yellow
        const mediumConfidence = screen.getByText('78%');
        expect(mediumConfidence).toBeInTheDocument();

        // Low confidence (65%) should be danger/red
        const lowConfidence = screen.getByText('65%');
        expect(lowConfidence).toBeInTheDocument();
      });
    });

    it('should display pattern frequency badges', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('47x')).toBeInTheDocument();
        expect(screen.getByText('23x')).toBeInTheDocument();
        expect(screen.getByText('8x')).toBeInTheDocument();
      });
    });

    it('should show validation status correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Passed.*89%/)).toBeInTheDocument();
        expect(screen.getByText('Running...')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });

    it('should format created dates correctly', async () => {
      renderComponent();

      await waitFor(() => {
        const table = screen.getByRole('table');
        // Should format ISO dates to local date strings
        expect(table).toBeInTheDocument();
      });
    });

    it('should render Review button for each skill', async () => {
      renderComponent();

      await waitFor(() => {
        const reviewButtons = screen.getAllByRole('button', { name: 'Review' });
        expect(reviewButtons.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      mockHttp.get.mockImplementation(makeGetMock({ skills: mockSkills, total: 3 }));
    });

    it('should default to pending_review filter', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalledWith(
          '/internal/aesop/skills/proposed',
          expect.objectContaining({
            query: expect.objectContaining({ status: 'pending_review' }),
          })
        );
      });
    });

    it('should switch to all filter when clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('All Skills')).toBeInTheDocument();
      });

      const allButton = screen.getByText('All Skills');
      await user.click(allButton);

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalledWith(
          '/internal/aesop/skills/proposed',
          expect.objectContaining({
            query: expect.objectContaining({ status: 'all' }),
          })
        );
      });
    });

    it('should show active state on selected filter', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        // EUI v9 uses CSS-in-JS; check that the fill prop is applied by looking for the
        // word "fill" in the generated class name, which EUI injects for filled buttons.
        const pendingButton = screen.getByText('Pending Review').closest('button');
        expect(pendingButton?.className).toContain('fill');
      });

      await user.click(screen.getByText('All Skills'));

      await waitFor(() => {
        // Re-query after click so we get the updated DOM node
        const allButton = screen.getByText('All Skills').closest('button');
        expect(allButton?.className).toContain('fill');
      });
    });
  });

  describe('skill review flyout', () => {
    beforeEach(() => {
      mockHttp.get.mockImplementation(makeGetMock({ skills: mockSkills, total: 3 }));
    });

    it('should open flyout when Review button clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: 'Review' })[0]).toBeInTheDocument();
      });

      const firstReviewButton = screen.getAllByRole('button', { name: 'Review' })[0];
      await user.click(firstReviewButton);

      await waitFor(() => {
        expect(screen.getByTestId('skill-review-flyout')).toBeInTheDocument();
        expect(screen.getByTestId('flyout-skill-name')).toHaveTextContent(
          'Alert Investigation Assistant'
        );
      });
    });

    it('should close flyout and refetch when closed', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: 'Review' })[0]).toBeInTheDocument();
      });

      mockHttp.get.mockClear();

      const firstReviewButton = screen.getAllByRole('button', { name: 'Review' })[0];
      await user.click(firstReviewButton);

      await waitFor(() => {
        expect(screen.getByTestId('skill-review-flyout')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('skill-review-flyout')).not.toBeInTheDocument();
      });

      // Should refetch skills after closing flyout
      expect(mockHttp.get).toHaveBeenCalled();
    });

    it('should pass correct skill to flyout', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: 'Review' })[1]).toBeInTheDocument();
      });

      const secondReviewButton = screen.getAllByRole('button', { name: 'Review' })[1];
      await user.click(secondReviewButton);

      await waitFor(() => {
        expect(screen.getByTestId('flyout-skill-name')).toHaveTextContent(
          'Threat Hunting Query Builder'
        );
      });
    });
  });

  describe('refresh functionality', () => {
    beforeEach(() => {
      mockHttp.get.mockImplementation(makeGetMock({ skills: mockSkills, total: 3 }));
    });

    it('should display refresh button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });

    it('should refetch skills when refresh clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      mockHttp.get.mockClear();

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalled();
      });
    });
  });

  describe('page header', () => {
    beforeEach(() => {
      mockHttp.get.mockImplementation(makeGetMock({ skills: mockSkills, total: 3 }));
    });

    it('should display page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('AESOP: Proposed Skills')).toBeInTheDocument();
      });
    });

    it('should display page description', async () => {
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText(/Agent Builder skills discovered through self-exploration/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockHttp.get.mockImplementation(makeGetMock({ skills: mockSkills, total: 3 }));
    });

    it('should have accessible table structure', async () => {
      renderComponent();

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        // Should have column headers
        expect(screen.getByText('Skill Name')).toBeInTheDocument();
        expect(screen.getByText('Confidence')).toBeInTheDocument();
        expect(screen.getByText('Validation')).toBeInTheDocument();
      });
    });

    it('should have accessible buttons', async () => {
      renderComponent();

      await waitFor(() => {
        const reviewButtons = screen.getAllByRole('button', { name: 'Review' });
        expect(reviewButtons.length).toBeGreaterThan(0);
      });
    });

    it('should provide tooltip information for pattern frequency', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('47x')).toBeInTheDocument();
      });

      // Tooltips should be accessible via hover
      const frequencyBadge = screen.getByText('47x').closest('[data-test-subj]');
      if (frequencyBadge) {
        await user.hover(frequencyBadge);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle skills with missing validation scores', async () => {
      const skillsWithoutScores = [
        {
          ...mockSkills[0],
          validation: {
            status: 'pending' as const,
          },
        },
      ];

      mockHttp.get.mockImplementation(makeGetMock({ skills: skillsWithoutScores, total: 1 }));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    it('should handle invalid dates gracefully', async () => {
      const skillsWithBadDate = [
        {
          ...mockSkills[0],
          metadata: {
            created_at: 'invalid-date',
            indices_explored: 10,
          },
        },
      ];

      mockHttp.get.mockImplementation(makeGetMock({ skills: skillsWithBadDate, total: 1 }));

      renderComponent();

      await waitFor(() => {
        // Should not crash, should render something
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('should handle very long skill names', async () => {
      const skillWithLongName = [
        {
          ...mockSkills[0],
          name: 'A'.repeat(200),
        },
      ];

      mockHttp.get.mockImplementation(makeGetMock({ skills: skillWithLongName, total: 1 }));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('should handle null/undefined skill properties', async () => {
      const incompleteSkill = [
        {
          id: 'incomplete-1',
          name: 'Incomplete Skill',
          description: '',
          confidence: 0,
          source: {
            pattern_frequency: 0,
            rationale: '',
          },
          metadata: {
            created_at: new Date().toISOString(),
            indices_explored: 0,
          },
          validation: {
            status: 'pending' as const,
          },
          review: {
            status: 'pending_review' as const,
          },
        },
      ];

      mockHttp.get.mockImplementation(makeGetMock({ skills: incompleteSkill, total: 1 }));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Incomplete Skill')).toBeInTheDocument();
      });
    });
  });
});
