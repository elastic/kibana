#!/bin/bash
echo -e "\n-- `date` Starting phase 3 Upgrade"

set -e
set -x
# if [ -f phase1.marker ]; then rm phase1.marker; fi
# cd to the qa/ dir where this script lives
cd "$( dirname "${BASH_SOURCE[0]}" )"
QADIR=$PWD

date
. ./envvars.sh

. ./get_builds.sh

. ./upgrade_packages.sh
# echo -e "\n-- `date` Install packages or extract archives"
# . ./install_packages.sh
#
# # if [ "${XPACK}" = "YES" ]; then
# # . ./install_xpacks.sh
# # fi
#
# # Write phase1.marker so the Windows provision.bat can check for it and
# # know that we made it here.
# # Other platforms probably don't need it.
# echo "SUCCESS" > phase1.marker
#
# if [ "${PLATFORM}" = "-windows-x86_64" ]; then
#   echo "after sleep 60 we'll taskkill //F //IM git-bash.exe"
#   sleep 60
#   taskkill //F //IM git-bash.exe
# fi
