#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

checks-reporter-with-killswitch "Check licenses" node scripts/check_licenses --dev
checks-reporter-with-killswitch "FOSSA license scan" fossa analyze -o && fossa test --timeout 3600
