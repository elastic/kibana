#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

cd "$KIBANA_DIR"

yarn storybook --site apm
yarn storybook --site canvas
yarn storybook --site ci_composite
yarn storybook --site custom_integrations
yarn storybook --site dashboard
yarn storybook --site dashboard_enhanced
yarn storybook --site data
yarn storybook --site embeddable
yarn storybook --site expression_error
yarn storybook --site expression_image
yarn storybook --site expression_metric
yarn storybook --site expression_repeat_image
yarn storybook --site expression_reveal_image
yarn storybook --site expression_shape
yarn storybook --site expression_tagcloud
yarn storybook --site fleet
yarn storybook --site infra
yarn storybook --site kibana_react
yarn storybook --site lists
yarn storybook --site observability
yarn storybook --site presentation
yarn storybook --site security_solution
yarn storybook --site shared_ux
yarn storybook --site ui_actions_enhanced
