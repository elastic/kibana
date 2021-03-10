#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

cd "$XPACK_DIR/plugins/canvas"
node scripts/storybook --dll

cd "$KIBANA_DIR"

# yarn storybook --site apm # TODO re-enable after being fixed
yarn storybook --site canvas
yarn storybook --site codeeditor
yarn storybook --site ci_composite
yarn storybook --site dashboard
yarn storybook --site dashboard_enhanced
yarn storybook --site data_enhanced
yarn storybook --site embeddable
yarn storybook --site infra
yarn storybook --site security_solution
yarn storybook --site ui_actions_enhanced
yarn storybook --site observability
